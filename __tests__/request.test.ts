import {beforeEach, describe, expect, jest, test} from '@jest/globals'
import axios from 'axios'
import FormData from 'form-data'
import {createReadStream} from 'fs'
import {resolve} from 'path'
import {
  createVersion,
  tryUpdateExtension,
  uploadSource
} from '../src/request'

jest.mock('axios')
jest.mock('fs', () => {
  const actualFs = jest.requireActual('fs') as typeof import('fs')
  return {
    ...actualFs,
    createReadStream: jest.fn(() => 'source-stream')
  }
})
jest.mock('form-data', () => {
  return jest.fn().mockImplementation(function MockFormData(this: {
    append: ReturnType<typeof jest.fn>
    getHeaders: ReturnType<typeof jest.fn>
  }) {
    this.append = jest.fn()
    this.getHeaders = jest.fn(() => ({
      'content-type': 'multipart/form-data; boundary=test'
    }))
  })
})

const mockedAxios = jest.mocked(axios)
const mockedCreateReadStream = jest.mocked(createReadStream)
const MockedFormData = FormData as unknown as {
  mock: {
    instances: unknown[]
  }
}

describe('request helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('createVersion sends approval notes in JSON payload', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: {id: 42, version: '1.0.0'}
    })

    await createVersion('addon-guid', 'upload-uuid', 'token', 'reviewer note')

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://addons.mozilla.org/api/v5/addons/addon/addon-guid/versions/',
      {
        upload: 'upload-uuid',
        approval_notes: 'reviewer note'
      },
      {
        headers: {
          Authorization: 'JWT token',
          'Content-Type': 'application/json'
        }
      }
    )
  })

  test('tryUpdateExtension creates version and uploads source when provided', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        processed: true,
        valid: true
      }
    })
    mockedAxios.post.mockResolvedValueOnce({
      data: {id: 7, version: '1.2.3'}
    })
    mockedAxios.patch.mockResolvedValueOnce({data: {}})

    const updated = await tryUpdateExtension(
      'addon-guid',
      'upload-uuid',
      'token',
      'reviewer note',
      'source.zip'
    )

    expect(updated).toBe(true)
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://addons.mozilla.org/api/v5/addons/addon/addon-guid/versions/',
      {
        upload: 'upload-uuid',
        approval_notes: 'reviewer note'
      },
      {
        headers: {
          Authorization: 'JWT token',
          'Content-Type': 'application/json'
        }
      }
    )

    const formDataInstance = MockedFormData.mock.instances[0] as {
      append: ReturnType<typeof jest.fn>
      getHeaders: ReturnType<typeof jest.fn>
    }
    expect(mockedCreateReadStream).toHaveBeenCalledWith(resolve('source.zip'))
    expect(formDataInstance.append).toHaveBeenCalledWith('source', 'source-stream')
    expect(mockedAxios.patch).toHaveBeenCalledWith(
      'https://addons.mozilla.org/api/v5/addons/addon/addon-guid/versions/7/',
      formDataInstance,
      {
        headers: {
          Authorization: 'JWT token',
          'content-type': 'multipart/form-data; boundary=test'
        }
      }
    )
  })

  test('tryUpdateExtension throws when validation completed but failed', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        processed: true,
        valid: false
      }
    })

    await expect(
      tryUpdateExtension('addon-guid', 'upload-uuid', 'token', 'note')
    ).rejects.toThrow('Extension validation failed')
  })

  test('uploadSource patches an existing version with multipart data', async () => {
    mockedAxios.patch.mockResolvedValueOnce({data: {}})

    await uploadSource('addon-guid', 9, 'source.zip', 'token')

    const formDataInstance = MockedFormData.mock.instances[0] as {
      append: ReturnType<typeof jest.fn>
      getHeaders: ReturnType<typeof jest.fn>
    }
    expect(formDataInstance.append).toHaveBeenCalledWith('source', 'source-stream')
    expect(mockedAxios.patch).toHaveBeenCalledWith(
      'https://addons.mozilla.org/api/v5/addons/addon/addon-guid/versions/9/',
      formDataInstance,
      {
        headers: {
          Authorization: 'JWT token',
          'content-type': 'multipart/form-data; boundary=test'
        }
      }
    )
  })
})
